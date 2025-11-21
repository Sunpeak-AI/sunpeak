import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/shadcn/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select"
import { useThemeContext } from "@/components/theme-provider"

export function ModeToggle() {
  const { theme } = useThemeContext()

  return (
    <Select value={theme} disabled>
      <SelectTrigger className="w-[180px]">
        <div className="flex items-center gap-2">
          {theme === "light" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            Light
          </div>
        </SelectItem>
        <SelectItem value="dark">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Dark
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

export function ModeToggleButton() {
  const { theme } = useThemeContext()

  return (
    <Button variant="ghost" size="icon" disabled>
      {theme === "light" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
