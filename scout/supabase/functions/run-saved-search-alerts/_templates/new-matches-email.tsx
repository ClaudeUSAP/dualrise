import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
  Hr,
  Row,
  Column,
  Img,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  starRating?: number;
  graduationYear?: number;
  country?: string;
  scoringAvg?: string;
  gpa?: number;
  profilePhoto?: string;
}

interface NewMatchesEmailProps {
  coachName: string;
  searchName: string;
  searchDescription?: string;
  newMatchesCount: number;
  totalMatchesCount: number;
  athletes: Athlete[];
  searchUrl: string;
}

export const NewMatchesEmail = ({
  coachName,
  searchName,
  searchDescription,
  newMatchesCount,
  totalMatchesCount,
  athletes,
  searchUrl,
}: NewMatchesEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        {newMatchesCount} new {newMatchesCount === 1 ? 'athlete matches' : 'athletes match'} your saved search "{searchName}"
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>✨ New Athlete Matches</Heading>
          </Section>

          <Text style={text}>
            Hi {coachName},
          </Text>

          <Text style={text}>
            Great news! <strong>{newMatchesCount}</strong> new {newMatchesCount === 1 ? 'athlete has' : 'athletes have'} matched your saved search <strong>"{searchName}"</strong>.
          </Text>

          {searchDescription && (
            <Text style={descriptionText}>
              {searchDescription}
            </Text>
          )}

          <Section style={statsBox}>
            <Row>
              <Column style={statColumn}>
                <Text style={statNumber}>{newMatchesCount}</Text>
                <Text style={statLabel}>New Matches</Text>
              </Column>
              <Column style={statColumn}>
                <Text style={statNumber}>{totalMatchesCount}</Text>
                <Text style={statLabel}>Total Matches</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={hr} />

          <Heading style={h2}>Top New Matches</Heading>

          {athletes.map((athlete, index) => (
            <Section key={athlete.id} style={athleteCard}>
              <Row>
                <Column style={{ width: '80px', verticalAlign: 'top' }}>
                  {athlete.profilePhoto ? (
                    <Img
                      src={athlete.profilePhoto}
                      width="64"
                      height="64"
                      alt={`${athlete.firstName} ${athlete.lastName}`}
                      style={avatarImage}
                    />
                  ) : (
                    <div style={avatarPlaceholder}>
                      {athlete.firstName.charAt(0)}{athlete.lastName.charAt(0)}
                    </div>
                  )}
                </Column>
                <Column style={{ verticalAlign: 'top' }}>
                  <Text style={athleteName}>
                    {athlete.firstName} {athlete.lastName}
                  </Text>
                  
                  {athlete.starRating && (
                    <Text style={athleteDetail}>
                      ⭐ {athlete.starRating}/7 Stars
                    </Text>
                  )}
                  
                  <Row>
                    {athlete.graduationYear && (
                      <Column style={badgeColumn}>
                        <span style={badge}>Class of {athlete.graduationYear}</span>
                      </Column>
                    )}
                    {athlete.country && (
                      <Column style={badgeColumn}>
                        <span style={badge}>📍 {athlete.country}</span>
                      </Column>
                    )}
                  </Row>

                  {(athlete.scoringAvg || athlete.gpa) && (
                    <Row style={{ marginTop: '8px' }}>
                      {athlete.scoringAvg && (
                        <Column style={metricColumn}>
                          <Text style={metricLabel}>Scoring Avg</Text>
                          <Text style={metricValue}>{athlete.scoringAvg}</Text>
                        </Column>
                      )}
                      {athlete.gpa && (
                        <Column style={metricColumn}>
                          <Text style={metricLabel}>GPA</Text>
                          <Text style={metricValue}>{athlete.gpa.toFixed(2)}</Text>
                        </Column>
                      )}
                    </Row>
                  )}
                </Column>
              </Row>
            </Section>
          ))}

          {newMatchesCount > athletes.length && (
            <Text style={moreMatchesText}>
              + {newMatchesCount - athletes.length} more {newMatchesCount - athletes.length === 1 ? 'athlete' : 'athletes'}
            </Text>
          )}

          <Section style={ctaSection}>
            <Button href={searchUrl} style={button}>
              View All {newMatchesCount} New Matches
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footerText}>
            You're receiving this email because you enabled alerts for the saved search "{searchName}". 
            To manage your notification preferences, log in to your account and visit your Saved Searches page.
          </Text>

        <Text style={footer}>
          Best regards,<br />
          The Scout by Dual Rise Team<br />
          Dual Rise
        </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default NewMatchesEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 20px',
  textAlign: 'center' as const,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: '8px 8px 0 0',
};

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
};

const h2 = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '24px 20px 16px',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 20px',
};

const descriptionText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 20px 16px',
  fontStyle: 'italic' as const,
};

const statsBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 20px',
  textAlign: 'center' as const,
};

const statColumn = {
  padding: '0 20px',
  textAlign: 'center' as const,
};

const statNumber = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#667eea',
  margin: '0 0 4px 0',
};

const statLabel = {
  fontSize: '12px',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 20px',
};

const athleteCard = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  margin: '12px 20px',
};

const avatarImage = {
  borderRadius: '50%',
  objectFit: 'cover' as const,
};

const avatarPlaceholder = {
  width: '64px',
  height: '64px',
  borderRadius: '50%',
  backgroundColor: '#667eea',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '20px',
  fontWeight: 'bold',
};

const athleteName = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: '0 0 4px 0',
};

const athleteDetail = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '4px 0',
};

const badgeColumn = {
  marginRight: '8px',
};

const badge = {
  display: 'inline-block',
  backgroundColor: '#f3f4f6',
  color: '#4b5563',
  fontSize: '12px',
  padding: '4px 8px',
  borderRadius: '4px',
  marginTop: '8px',
};

const metricColumn = {
  marginRight: '20px',
};

const metricLabel = {
  fontSize: '11px',
  color: '#9ca3af',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 2px 0',
};

const metricValue = {
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: '0',
};

const moreMatchesText = {
  textAlign: 'center' as const,
  color: '#6b7280',
  fontSize: '14px',
  fontStyle: 'italic' as const,
  margin: '16px 20px',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 20px',
};

const button = {
  backgroundColor: '#667eea',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '24px 20px 16px',
};

const footer = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '16px 20px',
};
