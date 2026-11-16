import { redirect } from 'next/navigation';

export default function GetFundedPage() {
  const wpGetFundedUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL
    ? `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/get-funded`
    : 'https://fundedgiants.ng/get-funded';
  redirect(wpGetFundedUrl);
}
