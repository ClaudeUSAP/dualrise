import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface PasswordResetEmailProps {
  userEmail: string;
  newPassword: string;
  loginUrl: string;
}

export const PasswordResetEmail = ({
  userEmail,
  newPassword,
  loginUrl,
}: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Your password has been reset by an administrator</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Password Reset</Heading>
        <Text style={text}>
          Your password has been reset by an administrator. You can now log in with your new credentials.
        </Text>
        
        <Section style={codeContainer}>
          <Text style={codeLabel}>Your new temporary password:</Text>
          <code style={code}>{newPassword}</code>
        </Section>

        <Text style={text}>
          <strong>Important:</strong> Please change this password immediately after logging in for security purposes.
        </Text>

        <Link
          href={loginUrl}
          target="_blank"
          style={{
            ...link,
            display: 'inline-block',
            marginTop: '16px',
            marginBottom: '16px',
            padding: '12px 24px',
            backgroundColor: '#2754C5',
            color: '#ffffff',
            textDecoration: 'none',
            borderRadius: '5px',
          }}
        >
          Log In Now
        </Link>

        <Text style={{ ...text, color: '#666', fontSize: '12px', marginTop: '24px' }}>
          If you did not request this password reset, please contact your administrator immediately.
        </Text>

        <Text style={footer}>
          This is an automated message. Please do not reply to this email.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default PasswordResetEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
  borderRadius: '5px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 20px',
  padding: '0',
};

const text = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
};

const codeContainer = {
  margin: '24px 0',
};

const codeLabel = {
  color: '#666',
  fontSize: '12px',
  fontWeight: 'bold',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
};

const code = {
  display: 'block',
  padding: '16px',
  backgroundColor: '#f4f4f4',
  borderRadius: '5px',
  border: '1px solid #e1e1e1',
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  letterSpacing: '1px',
  fontFamily: 'monospace',
};

const link = {
  color: '#2754C5',
  fontSize: '14px',
  textDecoration: 'underline',
};

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '22px',
  marginTop: '32px',
  borderTop: '1px solid #e1e1e1',
  paddingTop: '16px',
};
