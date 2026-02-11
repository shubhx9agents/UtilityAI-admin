'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // useEffect only runs on the client, so now we can safely show the UI
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Button
                variant="outline"
                size="icon"
                className="w-full justify-start"
                disabled
            >
                <Sun className="h-4 w-4 mr-2" />
                <span>Theme</span>
            </Button>
        )
    }

    return (
        <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
            {theme === 'dark' ? (
                <>
                    <Sun className="h-4 w-4 mr-2" />
                    <span>Light Mode</span>
                </>
            ) : (
                <>
                    <Moon className="h-4 w-4 mr-2" />
                    <span>Dark Mode</span>
                </>
            )}
        </Button>
    )
}
