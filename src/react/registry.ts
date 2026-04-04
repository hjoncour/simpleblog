import type {
  ComponentBlock,
  ComponentRegistry,
  LegacyComponentRegistry,
  Presentation,
  RegisteredComponentDefinition,
  RendererContext,
} from './types.js';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPresentation(value: unknown): value is Presentation {
  return isPlainObject(value);
}

export function createComponentRegistry<TRegistry extends ComponentRegistry>(registry: TRegistry): TRegistry {
  return registry;
}

function presentationFromBlock(block: Record<string, unknown>): Presentation | undefined {
  const explicit = block.presentation;
  if (isPresentation(explicit)) {
    return explicit;
  }

  const className = typeof block.className === 'string' ? block.className : undefined;
  const style = isPlainObject(block.style) ? block.style : undefined;

  if (!className && !style) {
    return undefined;
  }

  return {className, style};
}

export function normalizeComponentBlock(
  block: unknown,
  legacyComponents: LegacyComponentRegistry | undefined,
  context: RendererContext,
): ComponentBlock | null {
  if (!isPlainObject(block)) {
    return null;
  }

  if (typeof block.component === 'string') {
    return {
      component: block.component,
      props: isPlainObject(block.props) ? block.props : {},
      presentation: presentationFromBlock(block),
    };
  }

  const contentEntries = Object.entries(block).filter(
    ([key]) => !['className', 'presentation', 'style'].includes(key),
  );

  if (contentEntries.length !== 1) {
    return null;
  }

  const [legacyKey, legacyValue] = contentEntries[0];
  const definition = legacyComponents?.[legacyKey];
  if (!definition) {
    return null;
  }

  if (typeof definition === 'string') {
    return {
      component: definition,
      props: {value: legacyValue},
      presentation: presentationFromBlock(block),
    };
  }

  return {
    component: definition.component,
    props: definition.mapProps ? definition.mapProps(legacyValue, block, context) : {value: legacyValue},
    presentation: definition.presentation ?? presentationFromBlock(block),
  };
}

export function resolveRegisteredComponent(
  registry: ComponentRegistry,
  name: string,
): RegisteredComponentDefinition<any> | null {
  const resolved = registry[name];
  if (!resolved) {
    return null;
  }

  if (typeof resolved === 'function') {
    return {Component: resolved};
  }

  return resolved;
}
