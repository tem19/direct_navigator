import { app, Menu, type MenuItemConstructorOptions } from 'electron'

/**
 * Нативное системное меню macOS в верхней строке.
 * Минимальный шаблон: About/Quit + стандартный Edit.
 */
export function buildAppMenu(): Menu {
  const isMac = process.platform === 'darwin'
  const appName = app.getName()

  const template: MenuItemConstructorOptions[] = []

  if (isMac) {
    template.push({
      label: appName,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    })
  }

  template.push({
    label: 'Правка',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' }
    ]
  })

  template.push({
    label: 'Вид',
    submenu: [
      { role: 'reload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  })

  return Menu.buildFromTemplate(template)
}

export function installAppMenu(): void {
  Menu.setApplicationMenu(buildAppMenu())
}
