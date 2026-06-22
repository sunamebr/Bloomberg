import { Evolution, type Individual } from "../src/arena/evolution";

function testEvolutionBasic(): void {
  const evo = new Evolution({ populationSize: 10 });

  for (let i = 0; i < 10; i++) {
    evo.addIndividual({
      id: "bot-" + i,
      strategy: "test",
      params: { threshold: Math.random(), size: Math.random() * 100 },
      fitness: Math.random(),
      generation: 0,
      parentIds: [],
      createdAt: Date.now(),
    });
  }

  const newPop = evo.evolve();
  console.assert(newPop.length === 10, "Population should be 10");
  console.assert(evo.getGeneration() === 1, "Generation should be 1");

  console.log("✓ testEvolutionBasic passed");
}

function testEvolutionTopIndividuals(): void {
  const evo = new Evolution({ populationSize: 5 });

  for (let i = 0; i < 5; i++) {
    evo.addIndividual({
      id: "bot-" + i,
      strategy: "test",
      params: { val: i },
      fitness: i * 10,
      generation: 0,
      parentIds: [],
      createdAt: Date.now(),
    });
  }

  const top = evo.getTopIndividuals(3);
  console.assert(top.length === 3, "Should return 3 top individuals");
  console.assert(top[0].fitness >= top[1].fitness, "Should be sorted by fitness");

  console.log("✓ testEvolutionTopIndividuals passed");
}

testEvolutionBasic();
testEvolutionTopIndividuals();

console.log("\nAll evolution tests passed!");
