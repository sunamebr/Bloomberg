import { Logger } from "../core";

const log = new Logger("evolution");

export interface GeneticParams {
  mutationRate: number;
  mutationStrength: number;
  crossoverRate: number;
  elitism: number;
  populationSize: number;
}

export interface Individual {
  id: string;
  strategy: string;
  params: Record<string, number>;
  fitness: number;
  generation: number;
  parentIds: string[];
  createdAt: number;
}

export class Evolution {
  private population: Individual[] = [];
  private generation: number = 0;
  private config: GeneticParams;

  constructor(config: Partial<GeneticParams> = {}) {
    this.config = {
      mutationRate: config.mutationRate ?? 0.2,
      mutationStrength: config.mutationStrength ?? 0.1,
      crossoverRate: config.crossoverRate ?? 0.7,
      elitism: config.elitism ?? 2,
      populationSize: config.populationSize ?? 20,
    };
  }

  addIndividual(individual: Individual): void {
    this.population.push(individual);
    log.info("Individual added: " + individual.id + " fitness=" + individual.fitness.toFixed(2));
  }

  evolve(): Individual[] {
    if (this.population.length < 2) {
      log.warn("Population too small for evolution");
      return [];
    }

    this.generation++;
    const sorted = [...this.population].sort((a, b) => b.fitness - a.fitness);
    const newPopulation: Individual[] = [];

    // Elitism: keep top performers
    for (let i = 0; i < Math.min(this.config.elitism, sorted.length); i++) {
      newPopulation.push(sorted[i]);
    }

    // Generate offspring
    while (newPopulation.length < this.config.populationSize) {
      const parent1 = this.tournamentSelect(sorted);
      const parent2 = this.tournamentSelect(sorted);
      
      let child: Individual;
      if (Math.random() < this.config.crossoverRate) {
        child = this.crossover(parent1, parent2);
      } else {
        child = { ...parent1, id: this.generateId(), parentIds: [parent1.id] };
      }

      child = this.mutate(child);
      newPopulation.push(child);
    }

    this.population = newPopulation;
    log.info("Evolution complete: generation " + this.generation + ", population=" + this.population.length);
    
    return this.population;
  }

  private tournamentSelect(population: Individual[], tournamentSize: number = 3): Individual {
    const tournament: Individual[] = [];
    for (let i = 0; i < tournamentSize; i++) {
      const idx = Math.floor(Math.random() * population.length);
      tournament.push(population[idx]);
    }
    return tournament.sort((a, b) => b.fitness - a.fitness)[0];
  }

  private crossover(parent1: Individual, parent2: Individual): Individual {
    const newParams: Record<string, number> = {};
    const allKeys = new Set([...Object.keys(parent1.params), ...Object.keys(parent2.params)]);

    for (const key of allKeys) {
      if (Math.random() < 0.5 && parent1.params[key] !== undefined) {
        newParams[key] = parent1.params[key];
      } else if (parent2.params[key] !== undefined) {
        newParams[key] = parent2.params[key];
      }
    }

    return {
      id: this.generateId(),
      strategy: parent1.strategy,
      params: newParams,
      fitness: 0,
      generation: this.generation,
      parentIds: [parent1.id, parent2.id],
      createdAt: Date.now(),
    };
  }

  private mutate(individual: Individual): Individual {
    const mutatedParams = { ...individual.params };

    for (const key of Object.keys(mutatedParams)) {
      if (Math.random() < this.config.mutationRate) {
        const delta = mutatedParams[key] * this.config.mutationStrength * (Math.random() * 2 - 1);
        mutatedParams[key] = mutatedParams[key] + delta;
      }
    }

    return {
      ...individual,
      params: mutatedParams,
    };
  }

  private generateId(): string {
    return "gen" + this.generation + "-" + Math.random().toString(36).slice(2, 8);
  }

  getPopulation(): Individual[] {
    return [...this.population];
  }

  getGeneration(): number {
    return this.generation;
  }

  getTopIndividuals(limit: number = 5): Individual[] {
    return [...this.population].sort((a, b) => b.fitness - a.fitness).slice(0, limit);
  }

  reset(): void {
    this.population = [];
    this.generation = 0;
    log.info("Evolution reset");
  }
}

export const evolution = new Evolution();
