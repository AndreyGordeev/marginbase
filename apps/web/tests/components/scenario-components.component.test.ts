// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeI18nProvider } from '../../src/i18n';
import { renderScenarioEditorForm } from '../../src/ui/components/scenario-editor-form';
import { renderScenarioListPanel } from '../../src/ui/components/scenario-list-panel';

const createActionButton = (
  label: string,
  onClick: () => void,
  className?: string,
): HTMLButtonElement => {
  const button = document.createElement('button');
  button.textContent = label;
  button.className = className ?? '';
  button.onclick = onClick;
  return button;
};

describe('scenario components', () => {
  beforeEach(async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await initializeI18nProvider();
  });

  it('renders profit calculator form with interactive submit button', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const editor = renderScenarioEditorForm(
      'profit',
      'Profit',
      null,
      {
        scenarioName: 'Test',
        unitPriceMinor: 100,
        quantity: 10,
        variableCostPerUnitMinor: 50,
        fixedCostsMinor: 20,
      },
      { createActionButton, onSubmit },
    );

    expect(editor.querySelector('input[name="unitPriceMinor"]')).not.toBeNull();
    const submit = editor.querySelector(
      'button.form-submit',
    ) as HTMLButtonElement;
    expect(submit).not.toBeNull();
    submit.click();

    await Promise.resolve();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('renders scenario list with create/select/delete actions', async () => {
    const onSelectScenario = vi.fn();
    const onDeleteScenario = vi.fn().mockResolvedValue(undefined);
    const onCreateNew = vi.fn().mockResolvedValue(undefined);

    const panel = renderScenarioListPanel(
      [
        {
          schemaVersion: 1,
          scenarioId: 's1',
          module: 'profit',
          scenarioName: 'Scenario One',
          inputData: {},
          calculatedData: {},
          updatedAt: new Date().toISOString(),
        },
      ],
      'Profit',
      's1',
      {
        canOpenModule: vi.fn().mockReturnValue(true),
      } as never,
      {
        createActionButton,
        emptyState: (title: string, description: string) => {
          const el = document.createElement('div');
          el.textContent = `${title} ${description}`;
          return el;
        },
        onSelectScenario,
        onDeleteScenario,
        onCreateNew,
      },
    );

    expect(panel.querySelector('.scenario-item-active')).not.toBeNull();

    const name = panel.querySelector('.scenario-item span') as HTMLSpanElement;
    name.click();
    expect(onSelectScenario).toHaveBeenCalledWith('s1');

    const buttons = Array.from(panel.querySelectorAll('button'));
    buttons[0].click();
    expect(onCreateNew).toHaveBeenCalledTimes(1);
  });
});
