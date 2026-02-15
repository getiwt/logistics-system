import { Suspense } from "react";
import ShipmentsClient from "./ShipmentsClient";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ShipmentsClient />
    </Suspense>
  );
}
