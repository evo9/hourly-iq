import React from 'react';
import { Document, Page, View, Text, PDFDownloadLink } from '@react-pdf/renderer';
import { styles } from './PdfStyles';
import type { Client, Invoice, Payment } from '../types';
import { MONTHS_UA, formatMoney } from '../utils/format';
import {
  groupInvoicesByMonth,
  groupPaymentsByMonth,
  invoiceInRange,
  paymentInRange,
  calcCarriedDebt,
} from '../utils/groupByMonth';
import type { MonthYearRange } from '../utils/groupByMonth';

interface Props {
  client: Client;
  invoices: Invoice[];
  payments: Payment[];
  invoiceFilter: MonthYearRange;
  paymentFilter: MonthYearRange;
}

function rangeLabel(f: MonthYearRange): string {
  const from = f.from ? `${MONTHS_UA[f.from.month - 1]} ${f.from.year}` : '...';
  const to = f.to ? `${MONTHS_UA[f.to.month - 1]} ${f.to.year}` : '...';
  return `${from} — ${to}`;
}

// ─── PDF Document ─────────────────────────────────────────────────────────────

function ClientReportDocument({ client, invoices, payments, invoiceFilter, paymentFilter }: Props) {
  const filteredInvoices = invoices.filter(inv => invoiceInRange(inv, invoiceFilter));
  const filteredPayments = payments.filter(p => paymentInRange(p, paymentFilter));

  const totalInvoiced = filteredInvoices.reduce((s, i) => s + i.dueAmount, 0);
  const totalPaid = filteredPayments.reduce((s, p) => s + p.amount, 0);
  const debt = Math.max(0, totalInvoiced - totalPaid);

  const invoiceGroups = groupInvoicesByMonth(filteredInvoices);
  const paymentGroups = groupPaymentsByMonth(filteredPayments);

  const carriedDebt = invoiceFilter.from
    ? calcCarriedDebt(invoices, payments, invoiceFilter.from)
    : 0;

  const hasInvoiceFilter = invoiceFilter.from !== null || invoiceFilter.to !== null;
  const hasPaymentFilter = paymentFilter.from !== null || paymentFilter.to !== null;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>

        {/* Шапка */}
        <View style={styles.header}>
          <Text style={styles.clientName}>{client.name}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Виставлено</Text>
              <Text style={styles.summaryValue}>
                {formatMoney(totalInvoiced, client.currency)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Отримано</Text>
              <Text style={styles.summaryValue}>
                {formatMoney(totalPaid, client.currency)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Борг</Text>
              <Text style={debt > 0 ? styles.summaryValueRed : styles.summaryValue}>
                {formatMoney(debt, client.currency)}
              </Text>
            </View>
          </View>
          {hasInvoiceFilter ? (
            <Text style={styles.periodLabel}>Інвойси: {rangeLabel(invoiceFilter)}</Text>
          ) : null}
          {hasPaymentFilter ? (
            <Text style={styles.periodLabel}>Виплати: {rangeLabel(paymentFilter)}</Text>
          ) : null}
          {carriedDebt > 0 && invoiceFilter.from ? (
            <Text style={styles.carriedDebtLabel}>
              Перенесений борг (до {MONTHS_UA[invoiceFilter.from.month - 1]} {invoiceFilter.from.year}): {formatMoney(carriedDebt, client.currency)}
            </Text>
          ) : null}
        </View>

        {/* Два стовпці */}
        <View style={styles.columns}>

          {/* Інвойси */}
          <View style={styles.column}>
            <Text style={styles.columnTitle}>Інвойси</Text>
            {invoiceGroups.length === 0 ? (
              <Text style={styles.emptyText}>Немає інвойсів</Text>
            ) : null}
            {invoiceGroups.map(group => (
              <View key={group.key} style={styles.monthGroup}>
                <View style={styles.monthHeader}>
                  <Text style={styles.monthLabel}>{group.label}</Text>
                  <Text style={styles.monthTotal}>
                    {formatMoney(group.total, client.currency)}
                  </Text>
                </View>
                {group.items.map(inv => {
                  const hasDiscount = inv.amount !== inv.dueAmount;
                  return (
                    <View key={inv.id} style={styles.invoiceRow}>
                      <Text style={styles.invoiceCalc}>
                        {inv.hours}h × {inv.rate} {client.currency} = {formatMoney(inv.amount, client.currency)}
                      </Text>
                      {hasDiscount ? (
                        <Text style={styles.invoiceDue}>
                          До сплати: {formatMoney(inv.dueAmount, client.currency)}
                        </Text>
                      ) : null}
                      {inv.description ? (
                        <Text style={styles.invoiceDesc}>{inv.description}</Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Виплати */}
          <View style={styles.column}>
            <Text style={styles.columnTitle}>Виплати</Text>
            {paymentGroups.length === 0 ? (
              <Text style={styles.emptyText}>Немає виплат</Text>
            ) : null}
            {paymentGroups.map(group => (
              <View key={group.key} style={styles.monthGroup}>
                <View style={styles.monthHeader}>
                  <Text style={styles.monthLabel}>{group.label}</Text>
                  <Text style={styles.monthTotal}>
                    {formatMoney(group.total, client.currency)}
                    {group.items.length > 1 ? ` · ${group.items.length} пл.` : ''}
                  </Text>
                </View>
                {group.items.map(p => (
                  <React.Fragment key={p.id}>
                    <View style={styles.paymentRow}>
                      <Text style={styles.paymentDate}>{p.paidAt}</Text>
                      <Text style={styles.paymentAmount}>
                        {formatMoney(p.amount, client.currency)}
                      </Text>
                    </View>
                    {p.note ? (
                      <Text style={styles.paymentNote}>{p.note}</Text>
                    ) : null}
                  </React.Fragment>
                ))}
              </View>
            ))}
          </View>

        </View>
      </Page>
    </Document>
  );
}

// ─── Download Button ───────────────────────────────────────────────────────────

export function PdfDownloadButton({ client, invoices, payments, invoiceFilter, paymentFilter }: Props) {
  const hasFilter = invoiceFilter.from || invoiceFilter.to || paymentFilter.from || paymentFilter.to;
  const fromStr = invoiceFilter.from
    ? `${invoiceFilter.from.year}-${String(invoiceFilter.from.month).padStart(2, '0')}`
    : 'all';
  const toStr = invoiceFilter.to
    ? `${invoiceFilter.to.year}-${String(invoiceFilter.to.month).padStart(2, '0')}`
    : 'all';
  const filename = hasFilter
    ? `${client.name}-${fromStr}_${toStr}.pdf`
    : `${client.name}-all.pdf`;

  return (
    <PDFDownloadLink
      document={
        <ClientReportDocument
          client={client}
          invoices={invoices}
          payments={payments}
          invoiceFilter={invoiceFilter}
          paymentFilter={paymentFilter}
        />
      }
      fileName={filename}
      className="ml-auto text-sm px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors no-underline inline-flex items-center"
    >
      {({ loading }) => (loading ? 'Генерація...' : '↓ PDF')}
    </PDFDownloadLink>
  );
}
