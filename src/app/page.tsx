import { redirect } from 'next/navigation'

export default function Home() {
  // Root page redirects to login
  // Middleware will handle redirecting authenticated users to their dashboard
  redirect('/login')
}
