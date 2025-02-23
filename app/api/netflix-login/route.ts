import puppeteer from 'puppeteer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log('Executing /api/netflix-login route');
  try {
    const { email, password } = await request.json();
    console.log('Attempting Netflix login for email:', email);
    
    const browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    await page.goto('https://www.netflix.com/login');
    
    // Enter email
    await page.waitForSelector('input[name="userLoginId"]');
    await page.type('input[name="userLoginId"]', email);
    console.log('Email entered successfully');

    // Enter password
    await page.waitForSelector('input[name="password"]');
    await page.type('input[name="password"]', password);
    console.log('Password entered successfully');
    
    // Click login button
    await page.waitForSelector('button[data-uia="sign-in-button"]');
    await page.click('button[data-uia="sign-in-button"]');
    console.log('Login button clicked');
    
    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Keep browser open for 60 seconds
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    await browser.close();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Netflix automation error:', error);
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    );
  }
}