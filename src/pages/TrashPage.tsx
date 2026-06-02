import { Helmet } from "react-helmet-async";
import ManageChatsPage from "@/components/chat/ManageChatsPage";

const TrashPage = () => (
  <>
    <Helmet>
      <title>Papierkorb – Clemio</title>
      <meta name="description" content="Gelöschte Clemio-Chats wiederherstellen oder endgültig entfernen." />
      <link rel="canonical" href="https://clemio.app/trash" />
      <meta name="robots" content="noindex,follow" />
      <meta property="og:title" content="Papierkorb – Clemio" />
      <meta property="og:description" content="Gelöschte Clemio-Chats wiederherstellen oder endgültig entfernen." />
      <meta property="og:url" content="https://clemio.app/trash" />
    </Helmet>
    <ManageChatsPage mode="trash" title="Papierkorb" />
  </>
);

export default TrashPage;
