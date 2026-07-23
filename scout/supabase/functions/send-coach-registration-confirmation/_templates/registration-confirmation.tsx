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

interface RegistrationConfirmationEmailProps {
  firstName: string;
  lastName: string;
  university: string;
  email: string;
}

export const RegistrationConfirmationEmail = ({
  firstName,
  lastName,
  university,
  email,
}: RegistrationConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Thank you for registering with Scout by Dual Rise!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Registration Received! ✅</Heading>
        
        <Text style={text}>
          Hi {firstName},
        </Text>
        
        <Text style={text}>
          Thank you for registering with Scout by Dual Rise. We've received your application to join Scout by Dual Rise.
        </Text>

        <Section style={infoBox}>
          <Text style={infoTitle}>What happens next?</Text>
          <Text style={infoText}>
            Our team at Dual Rise is reviewing your registration. This typically takes 24-48 hours.
          </Text>
          <Text style={infoText}>
            You'll receive an email notification once your account is approved and you can start accessing our platform.
          </Text>
        </Section>

        <Text style={text}>
          <strong>Your Registration Details:</strong>
        </Text>
        
        <Section style={detailsBox}>
          <Text style={detailText}>• Email: {email}</Text>
          <Text style={detailText}>• University: {university}</Text>
          <Text style={detailText}>• Status: Pending Review</Text>
        </Section>

        <Hr style={hr} />

        <Text style={text}>
          <strong>Questions?</strong>
        </Text>
        
        <Text style={text}>
          If you have any questions about your registration or our platform, feel free to reach out to our team.
        </Text>

        <Text style={footer}>
          Best regards,<br />
          The Scout by Dual Rise Team<br />
          Dual Rise
        </Text>

        <Text style={footerSmall}>
          This email was sent because you registered for a Scout by Dual Rise account. If you didn't make this request, please contact us immediately.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default RegistrationConfirmationEmail;

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

const infoBox = {
  backgroundColor: '#e0f2fe',
  borderLeft: '4px solid #0284c7',
  padding: '20px',
  margin: '24px 40px',
  borderRadius: '4px',
};

const infoTitle = {
  color: '#0c4a6e',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const infoText = {
  color: '#075985',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '8px 0',
};

const detailsBox = {
  backgroundColor: '#f9fafb',
  padding: '20px',
  margin: '16px 40px',
  borderRadius: '4px',
};

const detailText = {
  color: '#484848',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '4px 0',
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
