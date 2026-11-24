let
  nodePkgs = import (fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/archive/55070e598e0e03d1d116c49b9eff322ef07c6ac6.tar.gz";
  }) { };
in
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    nodePkgs.nodejs-14_x
  ];

  shellHook = ''
    export PATH="$PWD/node_modules/.bin:$PATH"
    echo node $(node --version)
  '';
}
