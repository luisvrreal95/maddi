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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Restablece tu contraseña en Maddi</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://maddi.com.mx/favicon.svg"
          alt="Maddi"
          width="48"
          height="48"
          style={{ marginBottom: '24px' }}
        />
        <Heading style={h1}>Restablece tu contraseña</Heading>
        <Text style={text}>
          Recibimos una solicitud para restablecer la contraseña de tu cuenta en Maddi.
          Haz clic en el botón de abajo para elegir una nueva contraseña.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Restablecer contraseña
        </Button>
        <Text style={footer}>
          Si no solicitaste este cambio, puedes ignorar este correo.
          Tu contraseña no será modificada.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
