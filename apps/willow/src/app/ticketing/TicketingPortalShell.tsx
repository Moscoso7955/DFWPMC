import PreviewNotice from "../components/PreviewNotice";
import type { ReactNode } from "react";
import TicketingPortalHeader from "./TicketingPortalHeader";
import VersionBadge from "../components/VersionBadge";

type Props = {
  children: ReactNode;
  role?: "manager" | "door";
};

export default function TicketingPortalShell({ children, role = "manager" }: Props) {
  return (
    <div className="ticketing-portal">
      <TicketingPortalHeader role={role} />
      <main className="ticketing-portal-main"><PreviewNotice links />{children}</main>
      <VersionBadge variant="dark" />
    </div>
  );
}
