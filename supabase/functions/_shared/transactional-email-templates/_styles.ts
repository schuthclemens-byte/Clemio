// Shared Clemio brand styles for transactional email templates.
// Using HSL values from src/index.css.

export const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
  margin: 0,
  padding: 0,
}

export const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 24px',
}

export const card = {
  background: 'hsl(30, 25%, 97%)',
  borderRadius: '16px',
  padding: '32px 28px',
  border: '1px solid hsl(25, 15%, 90%)',
}

export const logoWrap = {
  textAlign: 'center' as const,
  marginBottom: '24px',
}

export const logoBadge = {
  display: 'inline-block',
  background: 'linear-gradient(135deg, hsl(18, 90%, 55%), hsl(340, 75%, 55%))',
  color: '#ffffff',
  fontWeight: '800' as const,
  fontSize: '20px',
  letterSpacing: '0.02em',
  padding: '10px 18px',
  borderRadius: '999px',
}

export const h1 = {
  fontSize: '24px',
  fontWeight: '700' as const,
  color: 'hsl(20, 30%, 10%)',
  margin: '0 0 16px',
  lineHeight: '1.3',
}

export const h2 = {
  fontSize: '16px',
  fontWeight: '700' as const,
  color: 'hsl(20, 30%, 10%)',
  margin: '24px 0 8px',
}

export const text = {
  fontSize: '15px',
  color: 'hsl(20, 20%, 25%)',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

export const textMuted = {
  fontSize: '13px',
  color: 'hsl(20, 10%, 46%)',
  lineHeight: '1.5',
  margin: '0 0 12px',
}

export const button = {
  display: 'inline-block',
  background: 'linear-gradient(135deg, hsl(18, 90%, 55%), hsl(18, 90%, 50%))',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '14px',
  padding: '14px 28px',
  textDecoration: 'none',
  boxShadow: '0 4px 12px hsla(18, 90%, 55%, 0.25)',
}

export const infoBox = {
  background: '#ffffff',
  borderRadius: '12px',
  padding: '16px 18px',
  margin: '16px 0',
  border: '1px solid hsl(25, 15%, 90%)',
}

export const infoRow = {
  fontSize: '14px',
  color: 'hsl(20, 20%, 25%)',
  margin: '4px 0',
  lineHeight: '1.5',
}

export const infoLabel = {
  fontWeight: '600' as const,
  color: 'hsl(20, 30%, 10%)',
}

export const footer = {
  fontSize: '12px',
  color: 'hsl(20, 10%, 46%)',
  textAlign: 'center' as const,
  margin: '24px 0 0',
  lineHeight: '1.5',
}

export const divider = {
  border: 'none',
  borderTop: '1px solid hsl(25, 15%, 90%)',
  margin: '24px 0',
}

export const accentBox = {
  background: 'hsl(18, 90%, 55%)',
  background2: 'linear-gradient(135deg, hsl(18, 90%, 55%) 0%, hsl(340, 75%, 55%) 100%)',
  borderRadius: '12px',
  padding: '20px 18px',
  color: '#ffffff',
  margin: '16px 0',
}
