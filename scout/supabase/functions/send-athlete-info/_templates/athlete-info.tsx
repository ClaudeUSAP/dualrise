import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
  Hr,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface AthleteInfoEmailProps {
  coachName: string;
  athleteData: {
    firstName: string;
    lastName: string;
    graduationYear?: number;
    country?: string;
    rating?: number;
    scoringAvg?: string;
    bestRecentScoring?: string;
    committedTo?: string;
    videoLinks?: string;
    gpa?: string;
    sat?: string;
  };
}

export const AthleteInfoEmail = ({
  coachName,
  athleteData,
}: AthleteInfoEmailProps) => {
  const { firstName, lastName, graduationYear, country, rating, scoringAvg, bestRecentScoring, committedTo, videoLinks, gpa, sat } = athleteData;

  return (
    <Html>
      <Head />
      <Preview>Athlete Information for {firstName} {lastName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Athlete Information Request Approved</Heading>
          
          <Text style={text}>
            Hi {coachName},
          </Text>
          
          <Text style={text}>
            Thank you for your interest in <strong>{firstName} {lastName}</strong>. We're pleased to provide you with the athlete's profile information.
          </Text>

          <Section style={profileSection}>
            <Heading style={h2}>{firstName} {lastName}</Heading>
            
            {graduationYear && (
              <Text style={profileItem}>
                <strong>Graduation Year:</strong> {graduationYear}
              </Text>
            )}
            
            {country && (
              <Text style={profileItem}>
                <strong>Hometown:</strong> {country}
              </Text>
            )}
            
            {rating && (
              <Text style={profileItem}>
                <strong>Rating:</strong> {rating}/7 Stars
              </Text>
            )}

            {bestRecentScoring && (
              <Text style={profileItem}>
                <strong>UTR:</strong> {bestRecentScoring}
              </Text>
            )}

            {scoringAvg && (
              <Text style={profileItem}>
                <strong>WTN:</strong> {scoringAvg}
              </Text>
            )}

            {gpa && (
              <Text style={profileItem}>
                <strong>GPA:</strong> {gpa}
              </Text>
            )}

            {sat && (
              <Text style={profileItem}>
                <strong>SAT:</strong> {sat}
              </Text>
            )}

            {committedTo && (
              <Text style={profileItem}>
                <strong>Status:</strong> Committed to {committedTo}
              </Text>
            )}

            {videoLinks && (
              <Text style={profileItem}>
                <strong>Video Links:</strong> {videoLinks}
              </Text>
            )}
          </Section>

          <Hr style={hr} />

          <Text style={text}>
            For additional details, tournament results, and to connect with the athlete, please log in to your SCOUT account.
          </Text>

        <Text style={footer}>
          Best regards,<br />
          The Scout by Dual Rise Team<br />
          Dual Rise
        </Text>

          <Text style={footerSmall}>
            This email was sent because you requested information about this athlete.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default AthleteInfoEmail;

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

const h2 = {
  color: '#1a1a1a',
  fontSize: '22px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const text = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
  margin: '16px 0',
};

const profileSection = {
  backgroundColor: '#f8f9fa',
  padding: '24px 40px',
  margin: '24px 40px',
  borderRadius: '8px',
  border: '1px solid #e6ebf1',
};

const profileItem = {
  color: '#484848',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
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
