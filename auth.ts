import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const keycloakIssuer = process.env.KEYCLOAK_ISSUER!;
// URL interna para chamadas server-side (dentro da rede Docker)
const keycloakIssuerInternal = process.env.KEYCLOAK_ISSUER_INTERNAL ?? keycloakIssuer;
const clientId = process.env.KEYCLOAK_CLIENT_ID!;
const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET!;
const tokenEndpoint = `${keycloakIssuerInternal}/protocol/openid-connect/token`;

async function refreshAccessToken(token: {
  refreshToken?: string;
  accessToken?: string;
  expiresAt?: number;
  error?: string;
}) {
  try {
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: token.refreshToken ?? "",
      }),
    });

    const data = await response.json();

    if (!response.ok) throw data;

    return {
      ...token,
      accessToken: data.access_token as string,
      refreshToken: data.refresh_token ?? token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in as number),
    };
  } catch {
    return { ...token, error: "RefreshTokenError" };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Keycloak",
      credentials: {
        username: { label: "Usuário", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        try {
          const response = await fetch(tokenEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "password",
              client_id: clientId,
              client_secret: clientSecret,
              username: credentials.username as string,
              password: credentials.password as string,
              scope: "openid profile email",
            }),
          });

          const data = await response.json();

          if (!response.ok) return null;

          // Decode JWT to get user info
          const payload = JSON.parse(
            Buffer.from(data.access_token.split(".")[1], "base64").toString()
          );

          return {
            id: payload.sub,
            name: payload.preferred_username ?? payload.name,
            email: payload.email,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt:
              Math.floor(Date.now() / 1000) + (data.expires_in as number),
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign-in
      if (user) {
        return {
          ...token,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          expiresAt: user.expiresAt,
        };
      }

      // Token still valid
      if (token.expiresAt && Date.now() / 1000 < token.expiresAt - 60) {
        return token;
      }

      // Token expired, refresh
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
});
