import "./globals.css";
import {ReactNode} from "react";
export const metadata={title:"Lock & Key Digital CRM",description:"Internal agency CRM"};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="en"><body>{children}</body></html>}