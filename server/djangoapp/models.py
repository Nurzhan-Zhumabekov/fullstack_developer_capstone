from typing import ClassVar

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


def max_model_year():
    return timezone.now().year + 1


class CarMake(models.Model):
    name = models.CharField(max_length=80, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class CarModel(models.Model):
    class BodyType(models.TextChoices):
        CONVERTIBLE = "Convertible"
        COUPE = "Coupe"
        HATCHBACK = "Hatchback"
        MINIVAN = "Minivan"
        PICKUP = "Pickup"
        SEDAN = "Sedan"
        SUV = "SUV"
        WAGON = "Wagon"

    car_make = models.ForeignKey(
        CarMake, related_name="models", on_delete=models.PROTECT
    )
    name = models.CharField(max_length=80)
    type = models.CharField(max_length=16, choices=BodyType.choices)
    year = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(2015), MaxValueValidator(max_model_year)],
    )

    class Meta:
        ordering = ("car_make__name", "name", "-year", "type")
        constraints: ClassVar[list[models.BaseConstraint]] = [
            models.UniqueConstraint(
                fields=("car_make", "name", "type", "year"),
                name="unique_car_make_model_type_year",
            ),
        ]

    def __str__(self):
        return f"{self.car_make} {self.name} ({self.year})"
