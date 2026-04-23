import { StyleSheet, Font } from '@react-pdf/renderer';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.woff', fontWeight: 'normal' },
    { src: '/fonts/Roboto-Bold.woff', fontWeight: 'bold' },
  ],
});

export const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    fontSize: 9,
    padding: 32,
    backgroundColor: '#ffffff',
  },
  // Шапка
  header: {
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 24,
  },
  summaryItem: {
    flexDirection: 'column',
  },
  summaryLabel: {
    fontSize: 8,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  summaryValueRed: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  periodLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 6,
  },
  carriedDebtLabel: {
    fontSize: 9,
    color: '#dc2626',
    marginTop: 4,
  },
  // Split view
  columns: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 12,
  },
  column: {
    flex: 1,
  },
  columnTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  // Група місяця
  monthGroup: {
    marginBottom: 10,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    padding: '4 6',
    marginBottom: 4,
  },
  monthLabel: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  monthTotal: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  // Рядок інвойсу
  invoiceRow: {
    paddingLeft: 6,
    marginBottom: 6,
  },
  invoiceCalc: {
    fontSize: 8,
    color: '#374151',
  },
  invoiceDue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#111827',
  },
  invoiceDesc: {
    fontSize: 7,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  // Рядок виплати
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 6,
    paddingVertical: 2,
  },
  paymentDate: {
    fontSize: 8,
    color: '#374151',
  },
  paymentAmount: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  paymentNote: {
    fontSize: 7,
    color: '#9ca3af',
    fontStyle: 'italic',
    paddingLeft: 6,
    marginBottom: 2,
  },
  // Empty state
  emptyText: {
    fontSize: 8,
    color: '#9ca3af',
    fontStyle: 'italic',
    paddingLeft: 6,
  },
});
