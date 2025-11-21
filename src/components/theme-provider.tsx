import * as React from "react"

type Theme = "light" | "dark"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  theme?: Theme
}

type ThemeProviderState = {
  theme: Theme
}

const ThemeProviderContext = React.createContext<ThemeProviderState | undefined>(
  undefined
)

export function ThemeProvider({
  children,
  defaultTheme = "light",
  theme: controlledTheme,
  ...props
}: ThemeProviderProps) {
  const [internalTheme] = React.useState<Theme>(defaultTheme)

  const theme = controlledTheme ?? internalTheme

  React.useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useThemeContext = () => {
  const context = React.useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useThemeContext must be used within a ThemeProvider")

  return context
}
