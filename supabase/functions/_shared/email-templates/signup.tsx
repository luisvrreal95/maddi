/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Confirma tu email en Maddi</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://maddi.com.mx/favicon.svg"
          alt="Maddi"
          width="48"
          height="48"
          style={{ marginBottom: '24px' }}
        />
        <Heading style={h1}>¡Bienvenido a Maddi!</Heading>
        <Text style={text}>
          Gracias por registrarte. Confirma tu dirección de correo electrónico ({recipient}) haciendo clic en el botón de abajo:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Verificar email
        </Button>
        <Text style={footer}>
          Si no creaste una cuenta en Maddi, puedes ignorar este correo.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#0A0A0A', fontFamily: 'Arial, sans-serif' }
const container = {
  padding: '40px 32px',
  backgroundColor: '#1A1A1A',
  borderRadius: '16px',
  maxWidth: '480px',
  margin: '40px auto',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#ffffff',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: 'rgba(255,255,255,0.65)',
  lineHeight: '1.6',
  margin: '0 0 28px',
}
const button = {
  backgroundColor: '#9BFF43',
  color: '#1A1A1A',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const footer = {
  fontSize: '13px',
  color: 'rgba(255,255,255,0.4)',
  margin: '32px 0 0',
  lineHeight: '1.5',
}
