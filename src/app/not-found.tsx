import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="not-found">
        <SearchX size={34} aria-hidden="true" />
        <span>404 / SKILL NOT FOUND</span>
        <h1>这个 Skill 不在当前目录里</h1>
        <p>可能是链接已经更新，返回技能广场重新选择。</p>
        <Link href="/skills"><ArrowLeft size={17} aria-hidden="true" />返回技能广场</Link>
      </main>
    </>
  );
}
