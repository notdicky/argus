import Link from 'next/link';
import { SignUpForm } from './sign-up-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SignUpPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-zinc-100">Create your account</CardTitle>
      </CardHeader>
      <CardContent>
        <SignUpForm />
        <p className="mt-4 text-sm text-zinc-400">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-emerald-400 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
