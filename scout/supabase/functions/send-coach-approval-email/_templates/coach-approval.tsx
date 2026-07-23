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
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface CoachApprovalEmailProps {
  firstName: string;
  lastName: string;
  university: string;
  loginUrl: string;
}

export const CoachApprovalEmail = ({
  firstName,
  lastName,
  university,
  loginUrl,
}: CoachApprovalEmailProps) => (
  <Html>
    <Head />
    <Preview>Your Scout by Dual Rise account has been approved!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to Scout by Dual Rise! 🎉</Heading>
        
        <Text style={text}>
          Hi {firstName},
        </Text>
        
        <Text style={text}>
          Great news! Your account for {university} has been approved by our team at Dual Rise.
        </Text>

        <Text style={text}>
          You now have full access to our platform featuring elite French & international tennis talent. Here's what you can do:
        </Text>

        <Section style={listContainer}>
          <Text style={listItem}>✓ Browse comprehensive athlete profiles</Text>
          <Text style={listItem}>✓ Save and organize your favorite recruits</Text>
          <Text style={listItem}>✓ Create custom searches with alerts</Text>
          <Text style={listItem}>✓ Submit contact requests directly to athletes</Text>
          <Text style={listItem}>✓ Export athlete data and tournament results</Text>
        </Section>

        <Section style={buttonContainer}>
          <Link
            href={loginUrl}
            target="_blank"
            style={button}
          >
            Log In to Your Account
          </Link>
        </Section>

        <Text style={linkFallback}>
          If the button doesn't work, copy and paste this link into your browser:<br />
          <Link href={loginUrl} style={linkStyle}>{loginUrl}</Link>
        </Text>

        <Hr style={hr} />

        <Text style={text}>
          If you have any questions or need assistance, please don't hesitate to reach out to our team.
        </Text>

        <Text style={footer}>
          Best regards,<br />
          The Scout by Dual Rise Team<br />
          Dual Rise
        </Text>

        <Text style={footerSmall}>
          This email was sent because you registered for a Scout by Dual Rise account.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default CoachApprovalEmail;

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

const listContainer = {
  padding: '0 40px',
  margin: '24px 0',
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
  backgroundColor: '#22c55e',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
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
  color: '#898989',
  fontSize: '12px',
  lineHeight: '20px',
  padding: '0 40px',
  marginTop: '32px',
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
