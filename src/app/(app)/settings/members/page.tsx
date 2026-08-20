import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/date";
import { getT } from "@/lib/preferences";
import { LANGUAGE_LABELS, toLanguage } from "@/lib/profile";
import { Avatar } from "@/components/avatar";

export const metadata = { title: "Members" };

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const [session, members, t] = await Promise.all([
    getCurrentUser(),
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        language: true,
        address: true,
        createdAt: true,
        avatarUpdatedAt: true,
      },
    }),
    getT(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2.5">
        <h2 className="text-sm font-medium">{t("members.heading")}</h2>
        <span className="text-sm text-muted">
          {t("members.count", { count: members.length })}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <Th>{t("members.columnMember")}</Th>
              <Th className="hidden lg:table-cell">
                {t("members.columnAddress")}
              </Th>
              <Th className="hidden md:table-cell">
                {t("members.columnLanguage")}
              </Th>
              <Th className="text-right">{t("members.columnJoined")}</Th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.id}
                className="border-b border-border last:border-b-0"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar
                      userId={member.id}
                      name={member.name}
                      avatarUpdatedAt={member.avatarUpdatedAt}
                      size={32}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {member.name}
                        </span>
                        {member.id === session?.id ? (
                          <span className="badge badge-indigo">
                            {t("members.you")}
                          </span>
                        ) : null}
                      </div>
                      <div className="truncate text-[13px] text-muted">
                        {member.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="hidden max-w-xs px-5 py-3.5 text-muted lg:table-cell">
                  <span className="line-clamp-2">
                    {member.address ?? t("common.empty")}
                  </span>
                </td>
                <td className="hidden px-5 py-3.5 text-muted md:table-cell">
                  {/* Shown in its own script, not translated: this is which
                      language the member reads, so it has to be legible to
                      them regardless of the viewer's locale. */}
                  {LANGUAGE_LABELS[toLanguage(member.language)]}
                </td>
                <td className="px-5 py-3.5 text-right text-muted tabular-nums">
                  {formatDate(member.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[13px] text-muted">{t("members.note")}</p>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-5 py-2.5 text-xs font-medium tracking-wide text-muted uppercase ${className}`}
    >
      {children}
    </th>
  );
}
