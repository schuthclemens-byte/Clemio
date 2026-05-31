import { Helmet } from "react-helmet-async";
import ManageChatsPage from "@/components/chat/ManageChatsPage";

const TrashPage = () => (
  <>
    <Helmet>
      <title>Papierkorb – Clemio</title>
      <meta name="description" content="Gelöschte Clemio-Chats wiederherstellen oder endgültig entfernen." />
      <link rel="canonical" href="https://clemio.app/trash" />
      <meta name="robots" content="noindex,follow" />
    </Helmet>
    <ManageChatsPage mode="trash" title="Papierkorb" />
  </>
);

export default TrashPage;
