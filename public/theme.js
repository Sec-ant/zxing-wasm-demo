(() => {
  try {
    const theme = localStorage.getItem("zxing-studio-theme");
    const dark =
      theme === "dark" ||
      (theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#100f0f" : "#fffcf0");
  } catch {}
})();
