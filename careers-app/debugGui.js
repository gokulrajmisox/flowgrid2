const noopController = {
  onChange() {
    return noopController;
  },
  name() {
    return noopController;
  },
};

const noopFolder = {
  add() {
    return noopController;
  },
  addColor() {
    return noopController;
  },
};

export const debugGui = {
  addFolder() {
    return noopFolder;
  },
  close() {},
  hide() {},
};
