import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db, users } from '@argus/db';
import { signInSchema } from '@argus/core';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/sign-in' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (raw) => {
        const parsed = signInSchema.safeParse(raw);
        if (!parsed.success) {
          return null;
        }
        const { email, password } = parsed.data;
        const user = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (!user?.passwordHash) {
          return null;
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }
        return { id: user.id, name: user.name ?? undefined, email: user.email };
      },
    }),
  ],
  callbacks: {
    session: ({ session, token }) => {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
