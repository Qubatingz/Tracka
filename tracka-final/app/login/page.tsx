import LoginForm from './LoginForm';

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = searchParams.next && searchParams.next.startsWith('/') ? searchParams.next : '/dashboard';
  return (
    <div className="page narrow">
      <div className="head">
        <div>
          <h1>Log in.</h1>
          <p className="sub">With your phone number. No password to remember.</p>
        </div>
      </div>
      <LoginForm next={next} />
    </div>
  );
}
