'use client';

import * as React from 'react';
import { MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center">
      {theme === 'dark' ? (
        <Button
          variant="secondary"
          className="cursor-pointer rounded-lg bg-inherit"
          size="icon"
          onClick={() => setTheme('light')}
        >
          <MoonIcon className="h-5 w-5" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="icon"
          className="cursor-pointer rounded-lg bg-inherit"
          onClick={() => setTheme('dark')}
        >
          <SunIcon className="h-5 w-5" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      )}
    </div>
  );
}