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
  Hr,
  Code,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface AdminWelcomeEmailProps {
  fullName: string;
  email: string;
  password?: string; // Optional - only used in fallback mode
  resetLink?: string; // Preferred - secure password reset link
  role: string;
  loginUrl: string;
  useResetLink?: boolean;
}

export const AdminWelcomeEmail = ({
  fullName,
  email,
  password,
  resetLink,
  role,
  loginUrl,
  useResetLink = false,
}: AdminWelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to Scout by Dual Rise - Your account is ready!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to Scout by Dual Rise! 🎉</Heading>
        
        <Text style={text}>
          Hi {fullName},
        </Text>
        
        <Text style={text}>
          Your {role} account has been created for the Scout by Dual Rise platform.
          {useResetLink && resetLink 
            ? " Please set your password using the secure link below."
            : " Here are your login credentials:"}
        </Text>

        {/* Secure Reset Link Mode (Preferred) */}
        {useResetLink && resetLink ? (
          <>
            <Section style={credentialsBox}>
              <Text style={credentialsTitle}>Set Your Password</Text>
              <Text style={credentialLabel}>Email:</Text>
              <Code style={credentialValue}>{email}</Code>
              <Text style={{...credentialLabel, marginTop: '16px'}}>
                Click the button below to set your secure password:
              </Text>
            </Section>

            <Section style={buttonContainer}>
              <Link
                href={resetLink}
                target="_blank"
                style={button}
              >
                Set My Password
              </Link>
            </Section>

            <Text style={linkFallback}>
              If the button doesn't work, copy and paste this link into your browser:<br />
              <Link href={resetLink} style={linkStyle}>{resetLink}</Link>
            </Text>

            <Section style={securityBox}>
              <Text style={securityTitle}>🔒 Security Notice</Text>
              <Text style={securityText}>
                • This link expires in 1 hour for your security
              </Text>
              <Text style={securityText}>
                • After setting your password, you can log in at the link below
              </Text>
              <Text style={securityText}>
                • Do not share this link with anyone
              </Text>
            </Section>

            <Section style={{textAlign: 'center' as const, marginTop: '20px'}}>
              <Link
                href={loginUrl}
                target="_blank"
                style={secondaryButton}
              >
                Go to Login Page
              </Link>
            </Section>
          </>
        ) : (
          /* Legacy Password Mode (Fallback) */
          <>
            <Section style={credentialsBox}>
              <Text style={credentialsTitle}>Your Login Credentials</Text>
              <Text style={credentialLabel}>Email:</Text>
              <Code style={credentialValue}>{email}</Code>
              <Text style={credentialLabel}>Temporary Password:</Text>
              <Code style={passwordValue}>{password}</Code>
            </Section>

            <Section style={securityBox}>
              <Text style={securityTitle}>🔒 Important Security Notice</Text>
              <Text style={securityText}>
                • Please change your password immediately after your first login
              </Text>
              <Text style={securityText}>
                • Do not share your credentials with anyone
              </Text>
              <Text style={securityText}>
                • This password is temporary and should be updated
              </Text>
            </Section>

            <Section style={buttonContainer}>
              <Link
                href={loginUrl}
                target="_blank"
                style={button}
              >
                Log In Now
              </Link>
            </Section>

            <Text style={linkFallback}>
              If the button doesn't work, copy and paste this link into your browser:<br />
              <Link href={loginUrl} style={linkStyle}>{loginUrl}</Link>
            </Text>
          </>
        )}

        <Hr style={hr} />

        <Text style={text}>
          <strong>What you can do as {role === 'admin' ? 'an Admin' : 'an Agent'}:</strong>
        </Text>

        {role === 'admin' && (
          <Section style={listContainer}>
            <Text style={listItem}>✓ Manage all athletes and tournaments</Text>
            <Text style={listItem}>✓ Review and approve coach registrations</Text>
            <Text style={listItem}>✓ Access analytics and reports</Text>
            <Text style={listItem}>✓ Manage other admin and agent accounts</Text>
            <Text style={listItem}>✓ Configure system settings</Text>
          </Section>
        )}

        {role === 'agent' && (
          <Section style={listContainer}>
            <Text style={listItem}>✓ Manage athletes and their data</Text>
            <Text style={listItem}>✓ Add and update tournament results</Text>
            <Text style={listItem}>✓ Import athlete and tournament data</Text>
            <Text style={listItem}>✓ View coach activity and requests</Text>
          </Section>
        )}

        <Text style={text}>
          If you have any questions or need assistance, please don't hesitate to reach out to our team.
        </Text>

        <Text style={footer}>
          Best regards,<br />
          The Scout by Dual Rise Team<br />
          Dual Rise
        </Text>

        {!useResetLink && password && (
          <Text style={footerSmall}>
            This email contains sensitive login information. Please keep it secure and delete it after changing your password.
          </Text>
        )}
      </Container>
    </Body>
  </Html>
);

export default AdminWelcomeEmail;

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
  maxWidth: '600px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0 40px',
  lineHeight: '1.3',
};

const text = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
  margin: '16px 0',
};

const credentialsBox = {
  backgroundColor: '#f0f9ff',
  borderLeft: '4px solid #0284c7',
  padding: '24px',
  margin: '24px 40px',
  borderRadius: '4px',
};

const credentialsTitle = {
  color: '#0c4a6e',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
};

const credentialLabel = {
  color: '#64748b',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  fontWeight: 'bold',
  margin: '16px 0 4px 0',
  letterSpacing: '0.5px',
};

const credentialValue = {
  backgroundColor: '#ffffff',
  color: '#1e293b',
  padding: '12px',
  borderRadius: '4px',
  fontSize: '14px',
  fontFamily: 'monospace',
  display: 'block',
  margin: '0',
  border: '1px solid #e2e8f0',
};

const passwordValue = {
  ...credentialValue,
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#0369a1',
};

const securityBox = {
  backgroundColor: '#fef2f2',
  borderLeft: '4px solid #dc2626',
  padding: '20px',
  margin: '24px 40px',
  borderRadius: '4px',
};

const securityTitle = {
  color: '#991b1b',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const securityText = {
  color: '#7f1d1d',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '6px 0',
};

const listContainer = {
  padding: '0 40px',
  margin: '16px 0',
};

const listItem = {
  color: '#484848',
  fontSize: '15px',
  lineHeight: '28px',
  margin: '4px 0',
};

const buttonContainer = {
  padding: '27px 0 27px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#0284c7',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
};

const secondaryButton = {
  backgroundColor: '#6b7280',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 24px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 40px',
};

const footer = {
  color: '#484848',
  fontSize: '14px',
  lineHeight: '24px',
  padding: '0 40px',
  margin: '24px 0 0',
};

const footerSmall = {
  color: '#dc2626',
  fontSize: '12px',
  lineHeight: '20px',
  padding: '0 40px',
  marginTop: '32px',
  fontWeight: 'bold',
};

const linkFallback = {
  color: '#666666',
  fontSize: '13px',
  lineHeight: '22px',
  padding: '0 40px',
  margin: '16px 0',
  textAlign: 'center' as const,
};

const linkStyle = {
  color: '#22c55e',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
};