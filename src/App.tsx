import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

import { Routes, Route, Link } from 'react-router-dom';
import CaptionCreator from './CaptionCreator';

const tools = [
  { name: "Caption creator", link: "/caption-creator" },
  { name: "EPUB to PDF", link: "/epub-to-pdf" },
  { name: "QR Generator", link: "/qr-generator" },
  { name: "Image Compressor", link: "/image-compressor" },
];

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    darkMode ? root.classList.add("dark") : root.classList.remove("dark");
  }, [darkMode]);

  const filteredTools = tools.filter((tool) =>
    tool.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen p-6 bg-white text-black dark:bg-gray-900 dark:text-white">
      {/* Header chung */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tools Hub</h1>
        <Button variant="outline" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} />}
        </Button>
      </div>
      {/* Các Route */}
      <Routes>
        {/* Trang chủ */}
        <Route
          path="/"
          element={
            <div>
              <Input
                placeholder="Find tools..."
                className="mb-4"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTools.length > 0 ? (
                  filteredTools.map((tool, index) => (
                    <Link key={index} to={tool.link} className="block">
                      <Card className="cursor-pointer hover:bg-neutral-100 dark:hover:bg-gray-800">
                        <CardContent className="p-4 flex justify-between items-center">
                          <span>{tool.name}</span>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                ) : (
                  <p>Không tìm thấy công cụ nào.</p>
                )}
              </div>
            </div>
          }
        />
        {/* Trang Caption Creator */}
        <Route path="/caption-creator" element={<CaptionCreator />} />
        {/* Các route khác nếu có */}
      </Routes>
    </div>
  );
}
