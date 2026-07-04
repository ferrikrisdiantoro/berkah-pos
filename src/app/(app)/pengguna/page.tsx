import { requireMaster } from "@/lib/auth";
import { listUsers, toggleUserActiveAction } from "@/lib/actions/users";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { AddUserForm } from "@/components/add-user-form";

export const dynamic = "force-dynamic";

export default async function PenggunaPage() {
  const me = await requireMaster();
  const users = await listUsers();

  return (
    <div className="max-w-4xl">
      <PageHeader title="Pengguna" subtitle="Kelola akun Master & Staf." />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Daftar Akun</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Nama / Email</TH>
                <TH>Peran</TH>
                <TH>Status</TH>
                <TH className="text-right">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {users.map((u) => (
                <TR key={u.id}>
                  <TD>
                    <div className="font-medium">{u.fullName ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TD>
                  <TD>
                    <Badge tone={u.role === "owner" ? "default" : "muted"}>
                      {u.role === "owner" ? "Master" : "Staf"}
                    </Badge>
                  </TD>
                  <TD>
                    {u.isActive ? (
                      <Badge tone="success">Aktif</Badge>
                    ) : (
                      <Badge tone="danger">Nonaktif</Badge>
                    )}
                  </TD>
                  <TD className="text-right">
                    {u.id === me.id ? (
                      <span className="text-xs text-muted-foreground">Anda</span>
                    ) : (
                      <form action={toggleUserActiveAction} className="inline">
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="activate" value={u.isActive ? "0" : "1"} />
                        <Button variant="outline" size="sm" type="submit">
                          {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                      </form>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Akun Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <AddUserForm />
        </CardContent>
      </Card>
    </div>
  );
}
