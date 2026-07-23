import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface PasswordResetLinkEmailProps {
  userEmail: string;
  actionLink: string;
  fallbackLink: string;
}

export const PasswordResetLinkEmail = ({
  userEmail,
  actionLink,
  fallbackLink,
}: PasswordResetLinkEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Reset Your Password</Heading>
        <Text style={text}>
          Hello,
        </Text>
        <Text style={text}>
          An administrator has initiated a password reset for your account ({userEmail}).
          Click the button below to create a new password for your account.
        </Text>
        <Section style={buttonContainer}>
          <Button 
            style={button} 
            href={actionLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Create New Password
          </Button>
        </Section>
        <Text style={text}>
          If the button above doesn't work, copy and paste this link into your browser:
        </Text>
        <Text style={linkText}>
          <Link href={actionLink} target="_blank" style={linkStyle}>
            {actionLink}
          </Link>
        </Text>
        <Text style={text}>
          This link will expire in 1 hour for security reasons.
        </Text>
        <Text style={securityText}>
          If you didn't request this password reset, you can safely ignore this email.
          Your password will remain unchanged.
        </Text>
        
        <Section style={{ margin: '32px 0 0 0', padding: '20px 40px 0 40px', borderTop: '1px solid #eee' }}>
          <Text style={{ ...text, fontSize: '14px', color: '#666', marginBottom: '16px' }}>
            🔧 <strong>Having trouble accessing the link above?</strong> Try this alternative link:
          </Text>
          <Section style={buttonContainer}>
            <Button 
              style={{ ...button, backgroundColor: '#6c757d' }} 
              href={fallbackLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Alternative Reset Link
            </Button>
          </Section>
          <Text style={{ ...linkText, fontSize: '12px', color: '#999' }}>
            <Link href={fallbackLink} target="_blank" style={linkStyle}>
              {fallbackLink}
            </Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default PasswordResetLinkEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '0 40px',
};

const securityText = {
  ...text,
  color: '#666',
  fontSize: '14px',
  marginTop: '32px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#0070f3',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 40px',
  cursor: 'pointer',
};

const linkText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
  padding: '0 40px',
  wordBreak: 'break-all' as const,
};

const linkStyle = {
  color: '#0070f3',
  textDecoration: 'underline',
};
