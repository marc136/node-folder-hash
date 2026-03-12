let
  # Different node.js versions
  # Last node.js with 10, 12, 14
  # node v10.24.1 v12.22.12 v14.19.1 v16.14.2 v18.0.0
  pkgs = import (fetchTarball https://github.com/NixOS/nixpkgs/archive/53f4763fd18f77e8433e205edaff7c8f979b83d8.tar.gz) {};

  # last node.js with v18.20.8
  #pkgs = import (fetchTarball https://github.com/NixOS/nixpkgs/archive/9407b1dfd1e39bf8229ead302593ab2c9fa08941.tar.gz) {};

  # v20.20.1 v22.22.1
  #pkgs = import (fetchTarball https://github.com/NixOS/nixpkgs/archive/13691e43dc8cc4d69e04584b57d59827dabb2dfa.tar.gz) {};
in
  pkgs.mkShell {
    buildInputs = [
      #pkgs.nodejs-10_x # is built locally, takes a long time
      pkgs.nodejs-12_x
      #pkgs.nodejs-14_x
      #pkgs.nodejs-16_x
      #pkgs.nodejs-18_x
      #pkgs.nodejs-20_x
      #pkgs.nodejs-22_x
    ];
  }

