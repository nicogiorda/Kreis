export type ModulePlaceholder = {
  module: string;
  status: "not_implemented";
  message: string;
};

export function createModulePlaceholder(moduleName: string): ModulePlaceholder {
  return {
    module: moduleName,
    status: "not_implemented",
    message: `The ${moduleName} module route is ready for backend implementation.`
  };
}
