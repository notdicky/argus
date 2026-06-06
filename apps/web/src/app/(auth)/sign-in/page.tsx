import Link from 'next/link';
import { SignInForm } from './sign-in-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SignInPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-zinc-100">Sign in</CardTitle>
      </CardHeader>
      <CardContent>
        <SignInForm />
        <p className="mt-4 text-sm text-zinc-400">
          No account?{' '}
          <Link href="/sign-up" className="text-emerald-400 hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
