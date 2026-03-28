/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface OrderItem {
  title: string
  quantity: number
  price: number
}

interface OrderConfirmationEmailProps {
  orderId: string
  customerName: string
  items: OrderItem[]
  subtotal: number
  deliveryFee: number
  discount: number
  total: number
  deliveryAddress: string
  paymentMethod: string
  orderDate: string
}

function formatIQD(amount: number) {
  return `${amount.toLocaleString('en-US')} IQD`
}

export const OrderConfirmationEmail = ({
  orderId,
  customerName,
  items,
  subtotal,
  deliveryFee,
  discount,
  total,
  deliveryAddress,
  paymentMethod,
  orderDate,
}: OrderConfirmationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your ELARA order #{orderId.slice(0, 8)} is confirmed! ✨</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Img
            src="https://elarastore.co/app-icon.png"
            width="44"
            height="44"
            alt="ELARA"
            style={{ borderRadius: '12px', margin: '0 auto' }}
          />
        </Section>

        <Heading style={h1}>Order Confirmed! ✨</Heading>
        <Text style={text}>
          Hi {customerName || 'there'}, thank you for shopping with ELARA! Your order has been received and is being prepared.
        </Text>

        {/* Order ID badge */}
        <Section style={orderBadge}>
          <Text style={orderBadgeLabel}>ORDER NUMBER</Text>
          <Text style={orderBadgeValue}>#{orderId.slice(0, 8).toUpperCase()}</Text>
          <Text style={orderBadgeDate}>{orderDate}</Text>
        </Section>

        {/* Items */}
        <Section style={itemsSection}>
          <Text style={sectionTitle}>Order Summary</Text>
          {items.map((item, i) => (
            <Row key={i} style={itemRow}>
              <Column style={itemName}>
                <Text style={itemText}>{item.title}</Text>
                <Text style={itemQty}>Qty: {item.quantity}</Text>
              </Column>
              <Column style={itemPrice}>
                <Text style={itemPriceText}>{formatIQD(item.price * item.quantity)}</Text>
              </Column>
            </Row>
          ))}
        </Section>

        <Hr style={divider} />

        {/* Totals */}
        <Section style={totalsSection}>
          <Row style={totalRow}>
            <Column><Text style={totalLabel}>Subtotal</Text></Column>
            <Column style={totalValueCol}><Text style={totalValue}>{formatIQD(subtotal)}</Text></Column>
          </Row>
          {discount > 0 && (
            <Row style={totalRow}>
              <Column><Text style={{ ...totalLabel, color: '#059669' }}>Discount</Text></Column>
              <Column style={totalValueCol}><Text style={{ ...totalValue, color: '#059669' }}>-{formatIQD(discount)}</Text></Column>
            </Row>
          )}
          <Row style={totalRow}>
            <Column><Text style={totalLabel}>Delivery</Text></Column>
            <Column style={totalValueCol}>
              <Text style={totalValue}>{deliveryFee === 0 ? 'FREE' : formatIQD(deliveryFee)}</Text>
            </Column>
          </Row>
          <Hr style={{ ...divider, margin: '8px 0' }} />
          <Row style={totalRow}>
            <Column><Text style={grandTotalLabel}>Total</Text></Column>
            <Column style={totalValueCol}><Text style={grandTotalValue}>{formatIQD(total)}</Text></Column>
          </Row>
        </Section>

        <Hr style={divider} />

        {/* Delivery & Payment */}
        <Section style={detailsSection}>
          <Row>
            <Column style={detailCol}>
              <Text style={detailTitle}>📍 Delivery Address</Text>
              <Text style={detailValue}>{deliveryAddress}</Text>
            </Column>
            <Column style={detailCol}>
              <Text style={detailTitle}>💳 Payment</Text>
              <Text style={detailValue}>{paymentMethod}</Text>
            </Column>
          </Row>
        </Section>

        {/* CTA */}
        <Section style={ctaSection}>
          <Link href="https://elarastore.co/orders" style={ctaButton}>
            Track Your Order
          </Link>
        </Section>

        {/* Footer */}
        <Section style={footerSection}>
          <Text style={footerText}>
            Need help? Reply to this email or reach us on WhatsApp.
          </Text>
          <Text style={footerBrand}>ELARA — Health & Beauty, Delivered ✨</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default OrderConfirmationEmail

// Styles
const main = { backgroundColor: '#faf7f5', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { maxWidth: '520px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden' as const }
const header = { backgroundColor: '#faf7f5', padding: '32px 0 16px', textAlign: 'center' as const }
const h1 = { fontSize: '26px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '16px 30px 8px', textAlign: 'center' as const }
const text = { fontSize: '14px', color: '#6b6b6b', lineHeight: '1.6', margin: '0 30px 24px', textAlign: 'center' as const }

const orderBadge = { backgroundColor: '#faf7f5', borderRadius: '12px', padding: '16px', margin: '0 30px 24px', textAlign: 'center' as const }
const orderBadgeLabel = { fontSize: '10px', fontWeight: 'bold' as const, color: '#b5838d', letterSpacing: '1.5px', margin: '0 0 4px', textTransform: 'uppercase' as const }
const orderBadgeValue = { fontSize: '20px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 4px', fontFamily: 'monospace, Courier' }
const orderBadgeDate = { fontSize: '12px', color: '#999', margin: '0' }

const sectionTitle = { fontSize: '13px', fontWeight: 'bold' as const, color: '#1a1a1a', letterSpacing: '0.5px', textTransform: 'uppercase' as const, margin: '0 0 12px', padding: '0 30px' }
const itemsSection = { padding: '0 0 8px' }
const itemRow = { padding: '6px 30px' }
const itemName = { verticalAlign: 'top' as const }
const itemText = { fontSize: '14px', color: '#333', margin: '0', lineHeight: '1.4' }
const itemQty = { fontSize: '12px', color: '#999', margin: '2px 0 0' }
const itemPrice = { verticalAlign: 'top' as const, textAlign: 'right' as const }
const itemPriceText = { fontSize: '14px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0' }

const divider = { borderColor: '#f0ebe8', margin: '16px 30px' }

const totalsSection = { padding: '0 30px' }
const totalRow = { marginBottom: '4px' }
const totalLabel = { fontSize: '13px', color: '#888', margin: '0' }
const totalValueCol = { textAlign: 'right' as const }
const totalValue = { fontSize: '13px', color: '#333', margin: '0' }
const grandTotalLabel = { fontSize: '16px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0' }
const grandTotalValue = { fontSize: '18px', fontWeight: 'bold' as const, color: '#b5838d', margin: '0' }

const detailsSection = { padding: '0 30px 16px' }
const detailCol = { verticalAlign: 'top' as const, width: '50%' }
const detailTitle = { fontSize: '11px', fontWeight: 'bold' as const, color: '#b5838d', letterSpacing: '0.5px', textTransform: 'uppercase' as const, margin: '0 0 4px' }
const detailValue = { fontSize: '13px', color: '#555', margin: '0', lineHeight: '1.5' }

const ctaSection = { textAlign: 'center' as const, padding: '8px 30px 24px' }
const ctaButton = { backgroundColor: '#b5838d', color: '#ffffff', fontSize: '14px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 32px', textDecoration: 'none', display: 'inline-block' }

const footerSection = { backgroundColor: '#faf7f5', padding: '24px 30px', textAlign: 'center' as const }
const footerText = { fontSize: '12px', color: '#999', margin: '0 0 8px' }
const footerBrand = { fontSize: '11px', color: '#b5838d', fontWeight: 'bold' as const, margin: '0' }
