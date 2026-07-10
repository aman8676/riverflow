import { users } from "@/models/server/config";
import { UserPrefs } from "@/store/auth";
import EditUser from "./EditUser";

const Page = async ({ params }: { params: Promise<{ userId: string; userSlug: string }> }) => {
  const { userId } = await params;
  const user = await users.get<UserPrefs>(userId);

  return <EditUser user={{ name: user.name, email: user.email, $id: user.$id }} />;
};

export default Page;
