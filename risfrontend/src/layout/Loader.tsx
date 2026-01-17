// src/layout/Loader.tsx
import React from "react";

const Loader: React.FC = () => (
  <div className="flex justify-center items-center h-full w-full">
    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 border-solid"></div>
  </div>
);

export default Loader;

