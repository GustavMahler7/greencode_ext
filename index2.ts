import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { jupyterIcon } from '@jupyterlab/ui-components';

/**
 * Initialization data for the greencode_ext extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'greencode_ext:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension greencode_ext is activated!');
  }
};

/**
 * A plugin providing export commands in the main menu and command palette
 */
export const exportPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/notebook-extension:export',
  autoStart: true,
  requires: [ITranslator, INotebookTracker],
  optional: [IMainMenu, ICommandPalette],
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator,
    tracker: INotebookTracker,
    mainMenu: IMainMenu | null,
    palette: ICommandPalette | null
  ) => {
    const trans = translator.load('jupyterlab');
    const { commands, shell } = app;
    const services = app.serviceManager;

    const isEnabled = (): boolean => {
      return Private.isEnabled(shell, tracker);
    };

    commands.addCommand(CommandIDs.exportToFormat, {
      label: args => {
        const formatLabel = args['label'] as string;
        return args['isPalette']
          ? trans.__('Export Notebook: %1', formatLabel)
          : formatLabel;
      },
      execute: args => {
        const current = getCurrent(tracker, shell, args);

        if (!current) {
          return;
        }

        const url = PageConfig.getNBConvertURL({
          format: args['format'] as string,
          download: true,
          path: current.context.path
        });
        const child = window.open('', '_blank');
        const { context } = current;

        if (child) {
          child.opener = null;
        }
        if (context.model.dirty && !context.model.readOnly) {
          return context.save().then(() => {
            child?.location.assign(url);
          });
        }

        return new Promise<void>(resolve => {
          child?.location.assign(url);
          resolve(undefined);
        });
      },
      isEnabled
    });

    // Add a notebook group to the File menu.
    const exportTo = new Menu({ commands });
    exportTo.title.label = trans.__('Export Notebook As…');
    void services.nbconvert.getExportFormats().then(response => {
      if (response) {
        const formatLabels: any = Private.getFormatLabels(translator);

        // Convert export list to palette and menu items.
        const formatList = Object.keys(response);
        formatList.forEach(function (key) {
          const capCaseKey = trans.__(key[0].toUpperCase() + key.substr(1));
          const labelStr = formatLabels[key] ? formatLabels[key] : capCaseKey;
          let args = {
            format: key,
            label: labelStr,
            isPalette: false
          };
          if (FORMAT_EXCLUDE.indexOf(key) === -1) {
            exportTo.addItem({
              command: CommandIDs.exportToFormat,
              args: args
            });
            if (palette) {
              args = {
                format: key,
                label: labelStr,
                isPalette: true
              };
              const category = trans.__('Notebook Operations');
              palette.addItem({
                command: CommandIDs.exportToFormat,
                category,
                args
              });
            }
          }
        });
        if (mainMenu) {
          const fileGroup = [
            { type: 'submenu', submenu: exportTo } as Menu.IItemOptions
          ];
          mainMenu.fileMenu.addGroup(fileGroup, 10);
        }
      }
    });
  }
};

export default extension;
