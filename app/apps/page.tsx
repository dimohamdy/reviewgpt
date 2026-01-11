import { AddAppDialog } from "@/components/apps/add-app-dialog";
import { AppCard } from "@/components/apps/app-card";
import { Card, CardContent } from "@/components/ui/card";

async function getApps() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/apps`,
      {
        cache: "no-store",
      }
    );

    if (!res.ok) {
      throw new Error("Failed to fetch apps");
    }

    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching apps:", error);
    return [];
  }
}

export default async function AppsPage() {
  const apps = await getApps();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Apps</h1>
          <p className="text-muted-foreground">
            Manage your apps and review collections
          </p>
        </div>
        <AddAppDialog />
      </div>

      {apps.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-4xl">📱</div>
              <div>
                <h3 className="text-lg font-semibold">No apps yet</h3>
                <p className="text-muted-foreground">
                  Add your first app to start collecting reviews
                </p>
              </div>
              <AddAppDialog />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {apps.map((app: any) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}
