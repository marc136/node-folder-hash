let
  nodePkgs = import (fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/archive/b6018f87da91d19d0ab4cf979885689b469cdd41.tar.gz";
  }) { };
in
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    nodePkgs.nodejs_24
  ];

  shellHook = ''
    export PATH="$PWD/node_modules/.bin:$PATH"
    echo node $(node --version)
  '';
}
