import { apiService } from '@services/api-service';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

const requireAuth = process.env.HEALTH_AUTH === 'true';
const authUsername = process.env.HEALTH_USERNAME;
const authPassword = process.env.HEALTH_PASSWORD;

export const GET = async () => {
  const authorization = (await headers()).get('authorization');
  const userAuth64 = Buffer.from(`${authUsername}:${authPassword}`).toString('base64');

  if (requireAuth && authorization !== `Basic ${userAuth64}`) {
    return new NextResponse('Not Authorized', { status: 401 });
  }

  try {
    const health = await apiService.get('health/up').then((res) => res.data);
    return NextResponse.json(health);
  } catch {
    return NextResponse.json({ status: 'ERROR!' }, { status: 500 });
  }
};
