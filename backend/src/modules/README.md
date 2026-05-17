# Modules

Cada carpeta es un dominio de producto. El modulo es dueno de sus reglas, casos de uso, repositorios y tests.

```text
auth/
users/
events/
communities/
posts/
discovery/
notifications/
```

## Capas internas esperadas

```text
api/             Rutas, controladores, validacion de entrada
application/     Casos de uso
domain/          Entidades y reglas de negocio
infrastructure/  Repositorios, queries, adaptadores externos
tests/           Pruebas del modulo
```

## Regla de dependencia

`api` puede llamar a `application`; `application` usa `domain` e interfaces; `infrastructure` implementa persistencia/adaptadores. Otros modulos no deberian importar internals de este modulo.
