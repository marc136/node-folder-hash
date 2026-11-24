let
  nodePkgs = import (fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/archive/e1ee359d16a1886f0771cc433a00827da98d861c.tar.gz";
  }) { };
in
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    nodePkgs.nodejs-18_x
  ];

  shellHook = ''
    export PATH="$PWD/node_modules/.bin:$PATH"
    echo node $(node --version)
  '';
}
